import { Component, OnInit, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as D3 from 'd3';

import { GamesListService, GamesListEntry, PlayerGameList } from './games-list.service';
import { UserLoginService, User } from '../login/user-login.service';


declare var Plotly: any;

@Component({
    selector: 'games-list',
    templateUrl: './games-list.component.html',
    providers: [GamesListService, UserLoginService, RouterModule]
})
export class GamesListComponent implements OnInit {
    gamesLists: Array<PlayerGameList>;
    currentSR: number;
    player: string;

    private linkKey: string;
    private linkMouse: number;

    constructor(private gamesListService: GamesListService,
                private loginService: UserLoginService,
                private router: Router) { }

    ngOnInit(): void {
        this.gamesListService.getGamesList().subscribe(
            res => {
                this.gamesLists = this.gamesListService.toGamesList(res);
                this.renderGraph(this.gamesLists[0].player);
                console.log(res);
            },
            err => {
                console.error(err);
            }
        );
        // Only fetch if user has not been fetched
    }
    
    playerHref(playerGames: PlayerGameList){
        return 'player_' + playerGames.player.replace(/\W/g, '_');
    }

    renderGraph(playerName: string) {
        this.player = playerName;

        let sr: Array<number> = [];
        let gamePoints: Array<number> = [];
        let last: number = null;
        let games = [];
        for (let playerGames of this.gamesLists) {
            if (playerGames.player == playerName) {
                games = playerGames.list;
            }
        }
        games = games.slice();
        games.reverse();
        if (games.length > 40){
            games = games.slice(sr.length - 40);
        }
        let index2id: Map<number, number> = new Map<number, number>();
        let x = 0;
        for (let game of games){
            if (game.sr == null){
                if (last != null){
                    sr.push(null);
                    gamePoints.push(null);
                }
            } else {
                if (last != null && last != game.startSR){
                    if (game.startSR != null){
                        sr.push(null);
                        gamePoints.push(null);
                    }
                    sr.push(game.startSR);
                    gamePoints.push(null);
                }
                gamePoints.push(game.sr);
                sr.push(game.sr);
                index2id.set(sr.length-1, game.num);
            }
            last = game.sr;
        }
        this.currentSR = last;

        let srDottedX: Array<number> = [];
        let srDottedY: Array<number> = [];
        for (let i = 1; i < sr.length-1; ++i){
            if (sr[i] == null){
                srDottedX.push(i-2);
                srDottedX.push(i-1);
                srDottedX.push(i+1);
                srDottedX.push(i+2);

                srDottedY.push(null);
                srDottedY.push(sr[i-1]);
                srDottedY.push(sr[i+1]);
                srDottedY.push(null);
            }
        }

        Plotly.newPlot('sr-graph', [
                {
                    y: sr,
                    mode: 'lines',
                    hoverinfo: 'skip',
                    line: {
                        color: '#c19400'
                    }
                },
                {
                    y: gamePoints,
                    mode: 'markers',
                    hoverinfo: 'y',
                    marker: {
                        size: 8,
                        color: '#c19400',
                    }
                },
                {
                    x: srDottedX,
                    y: srDottedY,
                    mode: 'lines',
                    hoverinfo: 'skip',
                    line: {
                        dash: 'dot',
                        color: '#c19400'
                    } 
                }
            ], 
            {
                title: '',
                font: {
                    color: 'rgb(150, 150, 150)'
                },
                xaxis: {
                    showgrid: false,
                    zeroline: false,
                    showticklabels: false,
                    fixedrange: true
                },
                yaxis: {
                    fixedrange: true,
                    nticks: 3,
                    side: 'right'
                },
                overlaying: false,
                bargroupgap: 0,
                margin: {
                    l: 10,
                    r: 40,
                    b: 5,
                    t: 5
                },
                showlegend: false,
                plot_bgcolor: "rgba(0, 0, 0, 0)",
                paper_bgcolor: "rgba(0, 0, 0, 0)",
            },
            {
                displayModeBar: false,
                staticPlot: false,
                doubleClick: false,
                showTips: false,
                showAxisDragHandles: false,
                showAxisRangeEntryBoxes: false,
                displaylogo: false,
            }
        );

        class CustomHTMLElement extends HTMLElement {
            constructor() {
                super();
            }
            on(event_type, cb) {}
        }

        let plot = <CustomHTMLElement>document.getElementById('sr-graph');
        let activeElement = null;
        plot.on('plotly_click', function(data){
            if (index2id.get(data.points[0].pointNumber)) {
                const element = document.getElementById('game-' + index2id.get(data.points[0].pointNumber));
                const player = D3.select('#gametable li.active a').text();
                if ( player !== playerName) {
                    D3.select('#gametable li.active').classed('active', false);
                    for (const elem of (D3.selectAll('#gametable li') as any)._groups[0]) {
                        const d3elem = D3.select(elem);
                        if (d3elem.select('a').size() && d3elem.select('a').text() === playerName) {
                            d3elem.classed('active', true);
                            const href = d3elem.select('a').attr('href');
                            D3.select('#gametable div.active').classed('active', false);
                            D3.select(href).classed('active', true);
                        } 
                    }
                }
                window.scrollTo(0, element.offsetTop);
                if (activeElement){
                    activeElement.classList.remove('active');
                }
                element.classList.add('active');
                activeElement = element;
            }
        });

    }
    
    formatTime(date: Date) {
        let hour = date.getHours();
        const pm = hour > 11;
        hour = hour % 12;
        hour = hour === 0 ? 12 : hour;
        let min: number|string = date.getMinutes();
        if (min < 10){
            min = '0' + min;
        }
        return hour + ':' + min + (pm ? 'pm' : 'am');
    }
    
    formatDate(date: Date) {
        return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear().toString().slice(2);
    }

    formatDay(date: Date) {
        var days = ['Sun','Mon','Tues','Wed','Thurs','Fri','Sat'];
        return days[date.getDay()]
    }

    route(id: string, event: any) {
        console.log(event.button);
        if (this.linkKey === id && this.linkMouse === event.button) {
            if (event.button === 0) { // Left mouse button
                this.router.navigate(['/game/' + id]);
            } else if (event.button === 1) { // Middle mouse button
                window.open('./game/' + id);
            }
        }
        this.linkKey = null;
        this.linkMouse = null;
    }

    prepRoute(id: string, event: any) {
        this.linkKey = id;
        this.linkMouse = event.button;
        if (event.button === 1) { // Middle mouse button
            event.preventDefault();
        }
    }


    wltClass(game: GamesListEntry) {
        if (game.result === 'UNKN') {
            return 'text-unknown';
        } else if (game.result === 'DRAW') {
            return 'text-warning';
        } else if (game.result === 'WIN') {
            return 'text-success';
        } else if (game.result === 'LOSS') {
            return 'text-danger';
        }
        throw new Error('Unexpected game result: ' + game.result);
    }

    min(game: GamesListEntry) {
        return Math.round(game.duration / 60);
    }

    map(game: GamesListEntry) {
        return game.map.toLowerCase().replace(' ', '-').replace(' ', '-').replace('\'', '').replace(':', '');
    }

    unit(game: GamesListEntry) {
        /* if (game.map === 'Nepal'
           || game.map === 'Volskaya Industries'
           || game.map === 'Hanamura'
           || game.map === 'Temple of Anubis'
           || game.map === 'Ilios'
           || game.map === 'Lijiang Tower'
           || game.map === 'Oasis') {
            return '';
        }
        return 'm'; */
        return '';
    }

    rank(sr: number) {
        if (sr === null || sr == undefined) {
            return 'unknown';
        } else if (sr < 1500) {
            return 'bronze';
        } else if (sr < 2000) {
            return 'silver';
        } else if (sr < 2500) {
            return 'gold';
        } else if (sr < 3000) {
            return 'platinium';
        } else if (sr < 3500) {
            return 'diamond';
        } else if (sr < 4000) {
            return 'master';
        } else {
            return 'grandmaster';
        }
    }
}
